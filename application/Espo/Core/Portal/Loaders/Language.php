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

namespace Espo\Core\Portal\Loaders;

use Espo\Core\Container\Loader;
use Espo\Core\InjectableFactory;
use Espo\Core\Portal\Utils\Language as LanguageService;
use Espo\Core\Utils\Config;

use Espo\Entities\Preferences;

class Language implements Loader
{
    public function __construct(
        private InjectableFactory $injectableFactory,
        private Config $config,
        private Preferences $preferences
    ) {}

    public function load(): LanguageService
    {
        return $this->injectableFactory->createWith(LanguageService::class, [
            'language' => LanguageService::detectLanguage($this->config, $this->preferences),
            'useCache' => $this->config->get('useCache') ?? false,
        ]);
    }
}
