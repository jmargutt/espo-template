<?php
/************************************************************************
 * This file is part of EspoCRM.
 *
 * EspoCRM - Open Source CRM application.
 * Copyright (C) 2014-2023 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
 * Website: https://www.espocrm.com
 *
 * EspoCRM is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * EspoCRM is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EspoCRM. If not, see http://www.gnu.org/licenses/.
 *
 * The interactive user interfaces in modified source and object code versions
 * of this program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU General Public License version 3.
 *
 * In accordance with Section 7(b) of the GNU General Public License version 3,
 * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
 ************************************************************************/

namespace Espo\Core\FieldProcessing\LinkParent;

use Espo\ORM\Entity;
use Espo\Core\ORM\Entity as CoreEntity;
use Espo\Core\FieldProcessing\Loader as LoaderInterface;
use Espo\Core\FieldProcessing\Loader\Params;

use Espo\ORM\Defs as OrmDefs;

/**
 * @implements LoaderInterface<Entity>
 */
class Loader implements LoaderInterface
{
    /** @var array<string, string[]> */
    private array $fieldListCacheMap = [];

    public function __construct(private OrmDefs $ormDefs)
    {}

    public function process(Entity $entity, Params $params): void
    {
        if (!$entity instanceof CoreEntity) {
            return;
        }

        foreach ($this->getFieldList($entity->getEntityType()) as $field) {
            $entity->loadParentNameField($field);
        }
    }

    /**
     * @return string[]
     */
    private function getFieldList(string $entityType): array
    {
        if (array_key_exists($entityType, $this->fieldListCacheMap)) {
            return $this->fieldListCacheMap[$entityType];
        }

        $list = [];

        $entityDefs = $this->ormDefs->getEntity($entityType);

        foreach ($entityDefs->getFieldList() as $fieldDefs) {
            if ($fieldDefs->getType() !== 'linkParent') {
                continue;
            }

            $name = $fieldDefs->getName();

            if (!$entityDefs->hasRelation($fieldDefs->getName())) {
                // Otherwise, loadParentNameField produces an error.
                // @todo Revise.
                continue;
            }

            $list[] = $name;
        }

        $this->fieldListCacheMap[$entityType] = $list;

        return $list;
    }
}
